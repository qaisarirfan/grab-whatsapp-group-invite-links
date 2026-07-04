function Header() {
  return (
    <header className="flex flex-col items-center justify-around">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center">
          <span className="relative inline-flex">
            <span className="absolute -bottom-1 left-1/2 flex -ml-3.5 size-7">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex size-7 rounded-full bg-green-500"></span>
            </span>
            <img src="./images/line-128.png" alt="logo" className="h-auto w-17.5" />
          </span>
        </div>
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
