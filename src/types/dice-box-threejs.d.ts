declare module "@3d-dice/dice-box-threejs" {
  type DiceBoxConfig = {
    assetPath?: string;
    framerate?: number;
    sounds?: boolean;
    volume?: number;
    color_spotlight?: number;
    shadows?: boolean;
    theme_surface?: string;
    sound_dieMaterial?: string;
    theme_customColorset?: unknown;
    theme_colorset?: string;
    theme_texture?: string;
    theme_material?: string;
    gravity_multiplier?: number;
    light_intensity?: number;
    baseScale?: number;
    strength?: number;
    iterationLimit?: number;
    iterationLimit?: number;
    onRollComplete?: (results: unknown) => void;
    onRerollComplete?: (results: unknown) => void;
    onAddDiceComplete?: (results: unknown) => void;
    onRemoveDiceComplete?: (results: unknown) => void;
  };

  export default class DiceBox {
    constructor(selector: string, config?: DiceBoxConfig);
    initialized: boolean;
    initialize(): Promise<void>;
    roll(notation: string): Promise<unknown>;
    clear(): void;
  }
}
