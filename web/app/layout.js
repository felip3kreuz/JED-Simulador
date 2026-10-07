import "./globals.css";

export const metadata = {
  title: "JED Simulador Web",
  description: "Versão web do JED Simulador, com motor em Go/WebAssembly.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
