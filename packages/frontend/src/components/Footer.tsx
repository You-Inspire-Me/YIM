const Footer = (): JSX.Element => {
  return (
    <footer className="border-t border-border bg-white py-10 dark:border-border dark:bg-primary">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center text-sm text-muted dark:text-muted md:flex-row md:text-left">
        <p>&copy; {new Date().getFullYear()} YIM. Alle rechten voorbehouden.</p>
        <div className="flex gap-6">
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="hover:text-primary">
            Instagram
          </a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" className="hover:text-primary">
            TikTok
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="hover:text-primary">
            YouTube
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
