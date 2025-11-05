const PageMeta = ({
  title,
}: {
  title: string;
  description: string;
}) => {
  // Update document title directly
  if (typeof document !== 'undefined') {
    document.title = title;
  }
  
  return null; // This component doesn't render anything visible
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PageMeta;
