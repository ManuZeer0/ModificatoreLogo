declare module "gifenc" {
  export interface QuantizeOptions {
    format?: string;
  }

  export interface WriteFrameOptions {
    palette?: number[] | Uint8Array;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions
    ): void;

    finish(): void;

    bytes(): Uint8Array;
  }

  export function GIFEncoder(): GIFEncoderInstance;

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions
  ): number[];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[],
    format?: string
  ): Uint8Array;
}
