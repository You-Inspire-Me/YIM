const Footer = (): JSX.Element => {
  return (
    <footer className="border-t border-gray-200 bg-white py-10 dark:border-gray-800 dark:bg-gray-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center text-sm text-gray-500 dark:text-gray-400 md:flex-row md:text-left">
        <p>&copy; {new Date().getFullYear()} YIM. Alle rechten voorbehouden.</p>
        <div className="flex gap-6">
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="hover:text-[#0EA5E9]">
            Instagram
          </a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" className="hover:text-[#0EA5E9]">
            TikTok
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="hover:text-[#0EA5E9]">
            YouTube
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
