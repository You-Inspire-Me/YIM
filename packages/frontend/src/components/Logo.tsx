import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = '' }: LogoProps): JSX.Element => {
  return (
    <Link to="/" className={`flex items-center ${className}`}>
      <div className="flex flex-col">
        <span className="font-sans text-2xl font-extrabold text-[#0EA5E9] leading-tight">YIM</span>
        <span className="font-sans text-[14px] font-medium text-[#64748B] leading-tight -mt-0.5">You Inspire Me</span>
      </div>
    </Link>
  );
};

export default Logo;
