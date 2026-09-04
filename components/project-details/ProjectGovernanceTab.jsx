'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function ProjectGovernanceTab({ project }) {
  if (!project) return null;

  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contexte du Projet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Contexte</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {project.contexte || 'Non défini'}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">Objectifs</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {project.objectifs || 'Non défini'}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">Cahier des charges (TDR)</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {project.termes_de_reference || 'Non défini'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comités & Partenaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Comité d'Experts (Technique)
              </p>
              {project.comite_technique?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.comite_technique.map((m, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun membre défini</p>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Comité Décideur (Pilotage)</p>
              {project.comite_pilotage?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.comite_pilotage.map((m, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucun membre défini</p>
              )}
            </div>
            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-2">Structures Partenaires</p>
              {project.structures_partenaires?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.structures_partenaires.map((m, i) => (
                    <Badge key={i} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Aucune structure définie</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
