// app/dashboard/smtp/add/page.tsx
import Header from '@/components/dashboard/Header';
import SmtpForm from '@/components/smtp/SmtpForm';

export default function AddSmtpPage() {
  return (
    <div>
      <Header title="Add SMTP Configuration" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <SmtpForm />
        </div>
      </div>
    </div>
  );
}