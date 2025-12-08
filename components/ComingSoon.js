import { Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function ComingSoon({ title, description, icon: Icon = Construction }) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>
      
      <Card className="p-12">
        <CardContent className="text-center">
          <Icon className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Module en cours de développement</h2>
          <p className="text-gray-600 mb-6">
            Cette fonctionnalité sera disponible prochainement. L'infrastructure est prête,
            l'interface utilisateur est en cours de finalisation.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Construction className="w-4 h-4" />
            <span className="font-medium">En développement actif</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
