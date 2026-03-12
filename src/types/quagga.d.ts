declare module 'quagga' {
  interface QuaggaStatic {
    init(config: any, callback?: (error: any) => void): void;
    start(): void;
    stop(): void;
    onDetected(callback: (result: any) => void): void;
  }
  
  const Quagga: QuaggaStatic;
  export default Quagga;
}