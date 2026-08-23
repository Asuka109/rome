export interface FileBrowserTreeNode {
  children?: FileBrowserTreeNode[];
  name: string;
  path: string;
  type: "file" | "directory";
}

interface MergeTreeNodesOptions {
  preserveChildrenForPaths: ReadonlySet<string>;
}

export function mergeTreeNodesPreservingLoadedChildren(
  incomingNodes: FileBrowserTreeNode[],
  existingNodes: FileBrowserTreeNode[],
  options: MergeTreeNodesOptions,
): FileBrowserTreeNode[] {
  const existingByPath = new Map(existingNodes.map((node) => [node.path, node]));

  return incomingNodes.map((incomingNode) => {
    if (incomingNode.type !== "directory") {
      return incomingNode;
    }

    const existingNode = existingByPath.get(incomingNode.path);
    if (existingNode?.type !== "directory" || !existingNode.children) {
      return incomingNode;
    }

    if (!incomingNode.children) {
      if (!options.preserveChildrenForPaths.has(incomingNode.path)) {
        return incomingNode;
      }
      return { ...incomingNode, children: existingNode.children };
    }

    return {
      ...incomingNode,
      children: mergeTreeNodesPreservingLoadedChildren(
        incomingNode.children,
        existingNode.children,
        options,
      ),
    };
  });
}

export function replaceTreeNodeChildren(
  nodes: FileBrowserTreeNode[],
  path: string,
  children: FileBrowserTreeNode[],
): FileBrowserTreeNode[] {
  return nodes.map((node) => {
    if (node.path === path && node.type === "directory") {
      return { ...node, children };
    }
    if (node.children) {
      return { ...node, children: replaceTreeNodeChildren(node.children, path, children) };
    }
    return node;
  });
}
