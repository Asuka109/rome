export const ADVANCED_EASTER_EGG_ART = String.raw`
          _____                   _______                   _____                    _____          
         /\    \                 /::\    \                 /\    \                  /\    \         
        /::\    \               /::::\    \               /::\____\                /::\    \        
       /::::\    \             /::::::\    \             /::::|   |               /::::\    \       
      /::::::\    \           /::::::::\    \           /:::::|   |              /::::::\    \      
     /:::/\:::\    \         /:::/~~\:::\    \         /::::::|   |             /:::/\:::\    \     
    /:::/__\:::\    \       /:::/    \:::\    \       /:::/|::|   |            /:::/__\:::\    \    
   /::::\   \:::\    \     /:::/    / \:::\    \     /:::/ |::|   |           /::::\   \:::\    \   
  /::::::\   \:::\    \   /:::/____/   \:::\____\   /:::/  |::|___|______    /::::::\   \:::\    \  
 /:::/\:::\   \:::\____\ |:::|    |     |:::|    | /:::/   |::::::::\    \  /:::/\:::\   \:::\    \ 
/:::/  \:::\   \:::|    ||:::|____|     |:::|    |/:::/    |:::::::::\____\/:::/__\:::\   \:::\____\
\::/   |::::\  /:::|____| \:::\    \   /:::/    / \::/    / ~~~~~/:::/    /\:::\   \:::\   \::/    /
 \/____|:::::\/:::/    /   \:::\    \ /:::/    /   \/____/      /:::/    /  \:::\   \:::\   \/____/ 
       |:::::::::/    /     \:::\    /:::/    /                /:::/    /    \:::\   \:::\    \     
       |::|\::::/    /       \:::\__/:::/    /                /:::/    /      \:::\   \:::\____\    
       |::| \::/____/         \::::::::/    /                /:::/    /        \:::\   \::/    /    
       |::|  ~|                \::::::/    /                /:::/    /          \:::\   \/____/     
       |::|   |                 \::::/    /                /:::/    /            \:::\    \         
       \::|   |                  \::/____/                /:::/    /              \:::\____\        
        \:|   |                   ~~                      \::/    /                \::/    /        
         \|___|                                            \/____/                  \/____/         
`;

export interface AdvancedEasterEggSequenceState {
  phase: "option" | "shift";
  count: number;
}

export interface AdvancedEasterEggKeyEvent {
  key: string;
  repeat?: boolean;
}

export const ADVANCED_EASTER_EGG_INITIAL_SEQUENCE: AdvancedEasterEggSequenceState = {
  phase: "option",
  count: 0,
};

const REQUIRED_OPTION_PRESSES = 5;
const REQUIRED_SHIFT_PRESSES = 2;

export function advanceAdvancedEasterEggSequence(
  state: AdvancedEasterEggSequenceState,
  event: AdvancedEasterEggKeyEvent,
): { state: AdvancedEasterEggSequenceState; unlocked: boolean } {
  if (event.repeat) {
    return { state, unlocked: false };
  }

  if (state.phase === "option") {
    if (isOptionKey(event.key)) {
      const count = state.count + 1;
      if (count >= REQUIRED_OPTION_PRESSES) {
        return { state: { phase: "shift", count: 0 }, unlocked: false };
      }
      return { state: { phase: "option", count }, unlocked: false };
    }
    return { state: restartFromKey(event.key), unlocked: false };
  }

  if (isShiftKey(event.key)) {
    const count = state.count + 1;
    if (count >= REQUIRED_SHIFT_PRESSES) {
      return { state: ADVANCED_EASTER_EGG_INITIAL_SEQUENCE, unlocked: true };
    }
    return { state: { phase: "shift", count }, unlocked: false };
  }

  return { state: restartFromKey(event.key), unlocked: false };
}

function restartFromKey(key: string): AdvancedEasterEggSequenceState {
  if (isOptionKey(key)) {
    return { phase: "option", count: 1 };
  }
  return ADVANCED_EASTER_EGG_INITIAL_SEQUENCE;
}

function isOptionKey(key: string): boolean {
  return key === "Alt" || key === "Option";
}

function isShiftKey(key: string): boolean {
  return key === "Shift";
}
