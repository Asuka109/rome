export function buildProfileProbeScript() {
  return String.raw`(function() {
    function clean(value) {
      return typeof value === 'string'
        ? value.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
    }
    var bodyText = clean(document.body && document.body.innerText || '');
    var nameNode = document.querySelector('main h1')
      || document.querySelector('main section h2')
      || document.querySelector('h1');
    var unavailableMatch = bodyText.match(
      /profile (?:is )?not available|profile unavailable|member not found|profile not found|this page doesn(?:'|’)t exist|page not found|you don(?:'|’)t have access to this profile|this profile is private/i
    );
    var authText = [location.href || '', document.title || '', bodyText.slice(0, 4000)].join('\n');
    return {
      current_url: location.href || '',
      name: clean(nameNode && (nameNode.innerText || nameNode.textContent)),
      auth_wall: /linkedin\.com\/(?:login|checkpoint|authwall|uas)/i.test(authText)
        || /\b(?:sign in|log in|join linkedin|captcha|verification required)\b/i.test(authText)
        || /(请登录|登录领英|安全验证)/.test(authText),
      unavailable: Boolean(unavailableMatch),
      unavailable_reason: unavailableMatch ? clean(unavailableMatch[0]) : '',
    };
  })()`;
}

export function buildContactExtractionScript() {
  return String.raw`(function() {
    function clean(value) {
      return typeof value === 'string'
        ? value.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()
        : '';
    }
    function unique(values) {
      var seen = {};
      return values.map(clean).filter(function(value) {
        var key = value.toLowerCase();
        if (!value || seen[key]) return false;
        seen[key] = true;
        return true;
      });
    }
    function headingOf(root) {
      var node = root.querySelector(':scope > div p, :scope > h3, :scope > h2')
        || root.querySelector('h3, h2, p');
      return clean(node && (node.innerText || node.textContent));
    }
    function sectionFromRoot(root, icon) {
      var heading = headingOf(root);
      var blocks = unique(Array.from(root.querySelectorAll('p, address')).map(function(node) {
        return node.innerText || node.textContent;
      })).filter(function(value) { return value.toLowerCase() !== heading.toLowerCase(); });
      var lines = unique(String(root.innerText || root.textContent || '').split(/\n+/))
        .filter(function(value) { return value.toLowerCase() !== heading.toLowerCase(); });
      var links = Array.from(root.querySelectorAll('a[href]')).map(function(link) {
        var context = link.closest('p, li, address');
        return {
          text: clean(link.innerText || link.textContent),
          href: link.href || link.getAttribute('href') || '',
          context: clean(context && (context.innerText || context.textContent)),
        };
      });
      return { heading: heading, icon: icon || '', blocks: blocks, lines: lines, links: links };
    }

    var dialogs = Array.from(document.querySelectorAll('dialog, [role="dialog"]'));
    var dialog = dialogs.find(function(candidate) {
      var header = candidate.querySelector('header h1, header h2, h1, h2');
      return /^contact info$/i.test(clean(header && (header.innerText || header.textContent)));
    });
    var legacy = document.querySelector('section.pv-contact-info');
    var scope = dialog || legacy;
    var sections = [];
    if (scope) {
      Array.from(scope.querySelectorAll('[data-testid="lazy-column"]')).forEach(function(column) {
        Array.from(column.children).forEach(function(row) {
          var icon = Array.from(row.children).find(function(child) {
            return child.tagName && child.tagName.toLowerCase() === 'svg' && child.id;
          });
          if (!icon) return;
          var section = sectionFromRoot(row, icon.id);
          if (section.heading) sections.push(section);
        });
      });
      if (!sections.length) {
        Array.from(scope.querySelectorAll('section.pv-contact-info__contact-type')).forEach(function(row) {
          var section = sectionFromRoot(row, '');
          if (section.heading) sections.push(section);
        });
      }
    }

    var bodyText = clean(document.body && document.body.innerText || '');
    var dialogText = clean(scope && (scope.innerText || scope.textContent));
    var authText = [location.href || '', document.title || '', bodyText.slice(0, 4000)].join('\n');
    var restrictedText = [bodyText.slice(0, 6000), dialogText].join('\n');
    return {
      current_url: location.href || '',
      dialog_found: Boolean(scope),
      sections: sections,
      auth_wall: /linkedin\.com\/(?:login|checkpoint|authwall|uas)/i.test(authText)
        || /\b(?:sign in|log in|join linkedin|captcha|verification required)\b/i.test(authText)
        || /(请登录|登录领英|安全验证)/.test(authText),
      restricted: /contact info(?:rmation)? (?:is )?(?:private|unavailable|restricted)|not allowed to view|don(?:'|’)t have access/i.test(restrictedText),
    };
  })()`;
}

export async function extractProfileProbe(page) {
  return page.evaluate(buildProfileProbeScript());
}

export async function extractLinkedInContactInfo(page) {
  return page.evaluate(buildContactExtractionScript());
}

export async function waitForLinkedInPage(page) {
  try {
    await page.wait({ selector: "main, dialog[data-testid=dialog], [role=dialog]", timeout: 12 });
  } catch {
    await page.wait(3);
  }
}

async function waitForLinkedInContactDialog(page) {
  try {
    await page.wait({ selector: "dialog[data-testid=dialog]", timeout: 10 });
  } catch {
    await page.wait(3);
  }
  await page.wait(1);
}

export async function openLinkedInContactSection(page, contactUrl) {
  const contactLinkPayload = await page.evaluate(
    `Boolean(document.querySelector('a[href*="/overlay/contact-info"]'))`,
  );
  const hasContactLink =
    contactLinkPayload && typeof contactLinkPayload === "object" && "data" in contactLinkPayload
      ? contactLinkPayload.data
      : contactLinkPayload;
  if (hasContactLink) {
    try {
      await page.click('a[href*="/overlay/contact-info"]');
      await page.wait(3);
      await waitForLinkedInContactDialog(page);
      const clickedPayload = await extractLinkedInContactInfo(page);
      if (clickedPayload?.dialog_found === true || clickedPayload?.data?.dialog_found === true) {
        return clickedPayload;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await page.goto(contactUrl);
      await waitForLinkedInContactDialog(page);
      const fallbackPayload = await extractLinkedInContactInfo(page);
      if (fallbackPayload?.dialog_found !== true && fallbackPayload?.data?.dialog_found !== true) {
        throw new Error(`LinkedIn could not open the Contact info section: ${message}`);
      }
      return fallbackPayload;
    }
  }

  await page.goto(contactUrl);
  await waitForLinkedInContactDialog(page);
  return extractLinkedInContactInfo(page);
}
