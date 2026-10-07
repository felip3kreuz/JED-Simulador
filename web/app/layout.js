import "./globals.css";

export const metadata = {
  title: "JED Simulador Web",
  description: "JED Simulador no navegador, com motor Go/WebAssembly e autenticação no JED Servidor.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
