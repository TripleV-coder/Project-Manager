'use client';

import { Milestone, Upload, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ProjectDeliverablesTab({
  deliverables,
  projectId,
  router,
  uploadingDeliverableId,
  handleUploadDeliverableFile,
  t,
}) {
  return (
    <div className="space-y-6 mt-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{t('projectDeliverablesTitle')}</h2>
          <p className="text-sm text-gray-600">{t('projectDeliverablesDesc')}</p>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/roadmap?project=${projectId}`)}
          variant="outline"
          className="text-indigo-600"
        >
          <Milestone className="w-4 h-4 mr-2" />
          Gérer dans la Roadmap
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {deliverables.length > 0 ? (
          deliverables.map((deliverable) => (
            <Card key={deliverable._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-orange-50 rounded-lg shrink-0 mt-1">
                    <Milestone className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{deliverable.nom}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {deliverable.description || 'Aucune description'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline" className="bg-gray-50">
                        {deliverable.statut_global || 'Non défini'}
                      </Badge>
                      {deliverable.date_échéance && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Échéance:{' '}
                          {new Date(deliverable.date_échéance).toLocaleDateString('fr-FR')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input
                    type="file"
                    id={`upload-${deliverable._id}`}
                    className="hidden"
                    onChange={(e) => handleUploadDeliverableFile(e, deliverable._id)}
                  />
                  <label htmlFor={`upload-${deliverable._id}`}>
                    <Button
                      asChild
                      variant="outline"
                      className="cursor-pointer border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      disabled={uploadingDeliverableId === deliverable._id}
                    >
                      <div>
                        {uploadingDeliverableId === deliverable._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Déposer un fichier
                      </div>
                    </Button>
                  </label>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium text-gray-900">{t('noDeliverables')}</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
                {t('noDeliverablesDesc')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
