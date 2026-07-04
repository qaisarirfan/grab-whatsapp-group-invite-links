function Header() {
  return (
    <header className="flex flex-col items-center justify-around p-2">
      <div className="flex flex-col items-center">
        <img src="./images/logo.png" alt="logo" className="h-auto w-17.5" />
        <p className="text-lg">Grab whatsapp group invite links</p>
      </div>
      <div className="flex items-center gap-3 py-4.5">
        <p>Support me on</p>
        <a href="https://www.buymeacoffee.com/qaisarirfan" target="_blank" rel="noreferrer">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" className="h-7.5" />
        </a>
      </div>
    </header>
  );
}

export default Header;
