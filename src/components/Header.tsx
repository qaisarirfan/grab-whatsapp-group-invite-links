function Header() {
  return (
    <header className="flex flex-col items-center justify-around">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-center">
          <span className="relative inline-flex">
            <span aria-hidden="true" className="absolute -bottom-1 left-1/2 flex -ml-3.5 size-7">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex size-7 rounded-full bg-green-500"></span>
            </span>
            <img src="./images/line-128.png" alt="logo" className="h-auto w-17.5" />
          </span>
        </div>
        <p className="text-lg">Grab WhatsApp Group Invite Links</p>
      </div>
    </header>
  );
}

export default Header;
