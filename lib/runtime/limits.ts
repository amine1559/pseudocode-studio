export interface ExecutionLimits {
  maxInstructions: number;
  maxMilliseconds: number;
  maxRecursionDepth: number;
  maxArraySize: number;
  maxOutputChars: number;
  maxLoopIterations: number;
}

export const DEFAULT_LIMITS: ExecutionLimits = {
  maxInstructions: 100_000,
  maxMilliseconds: 15_000,
  maxRecursionDepth: 128,
  maxArraySize: 10_000,
  maxOutputChars: 50_000,
  maxLoopIterations: 20_000,
};
