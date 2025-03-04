// app/dashboard/templates/create/page.tsx
import Header from '@/components/dashboard/Header';
import TemplateEditor from '@/components/email/TemplateEditor';

export default function CreateTemplatePage() {
  return (
    <div>
      <Header title="Create Email Template" />
      
      <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Remove the onSuccess prop */}
          <TemplateEditor />
        </div>
      </div>
    </div>
  );
}