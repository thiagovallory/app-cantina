declare module 'quagga' {
  interface QuaggaStatic {
    init(config: unknown, callback?: (error: Error | null) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: unknown) => void): void;
  }
  
  const Quagga: QuaggaStatic;
  export default Quagga;
}
