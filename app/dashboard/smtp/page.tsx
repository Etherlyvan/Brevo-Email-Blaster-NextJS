// app/dashboard/smtp/page.tsx
import Header from '@/components/dashboard/Header';
import SmtpList from '@/components/smtp/SmtpList';

export default function SmtpPage() {
  return (
    <div>
      <Header title="SMTP Configurations" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <SmtpList />
        </div>
      </div>
    </div>
  );
}