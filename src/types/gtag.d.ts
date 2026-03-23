/* Google Analytics gtag.js global type */
interface GtagEventParams {
  [key: string]: string | number | boolean | undefined;
}

interface Window {
  gtag?: (
    command: "event" | "config" | "set",
    targetOrName: string,
    params?: GtagEventParams
  ) => void;
}
