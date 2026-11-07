import React from "react";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="w-full bg-slate-950/80 border-t border-slate-900 shadow-xl p-6 flex flex-col items-center space-y-4">
      <div className="flex items-center gap-2">
        <Image
          src="/miraku-logo.svg"
          alt="Логотип Miraku"
          width="40"
          height="40"
          className="rounded-xl shadow-md"
        />
        <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-500 to-cyan-400">
          Miraku
        </span>
      </div>
      <p className="text-xs text-gray-400 text-center max-w-xl">
        Miraku не хранит видеофайлы на своих серверах: сайт отображает информацию об аниме и ссылки на медиаматериалы сторонних сервисов.
      </p>
      <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Miraku. Все права защищены.</p>
    </footer>
  );
};

export default Footer;
