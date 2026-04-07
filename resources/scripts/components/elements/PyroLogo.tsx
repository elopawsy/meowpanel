// million-ignore
const Logo = ({ className }: { className?: string; uniqueId?: string } = {}) => {
    return (
        <span
            className={className || 'flex items-center'}
            style={{ fontWeight: 700, fontSize: '1.25rem', color: 'white', letterSpacing: '0.01em' }}
        >
            Meowpanel
        </span>
    );
};

export default Logo;
