'use client';

import { motion } from 'framer-motion';
import {
  Layers,
  Edit2,
  Trash2,
  Copy,
  Type,
  Hash,
  Calendar,
  List,
  User,
  FileText,
  DollarSign,
  Link2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const FIELD_TYPES = [
  { value: 'texte', label: 'Texte', icon: Type },
  { value: 'nombre', label: 'Nombre', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'sélecteur', label: 'Liste déroulante', icon: List },
  { value: 'utilisateur', label: 'Utilisateur', icon: User },
  { value: 'fichier', label: 'Fichier', icon: FileText },
  { value: 'budget', label: 'Budget', icon: DollarSign },
  { value: 'url', label: 'URL', icon: Link2 },
];

function getFieldIcon(type) {
  const fieldType = FIELD_TYPES.find((f) => f.value === type);
  return fieldType ? fieldType.icon : Type;
}

export function TemplateCard({ template, idx, onEdit, onCopy, onDelete }) {
  return (
    <motion.div
      key={template._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-lg">{template.nom}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">{template.description}</CardDescription>
            </div>
            {template.catégorie && <Badge variant="secondary">{template.catégorie}</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Champs personnalisés</span>
              <Badge variant="outline" className="font-medium">
                {template.champs?.length || 0}
              </Badge>
            </div>

            {template.champs?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.champs.slice(0, 4).map((field, i) => {
                  const FieldIcon = getFieldIcon(field.type);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                    >
                      <FieldIcon className="w-3 h-3" />
                      <span className="truncate max-w-[80px]">{field.label}</span>
                    </div>
                  );
                })}
                {template.champs.length > 4 && (
                  <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500">
                    +{template.champs.length - 4}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(template)}>
              <Edit2 className="w-3 h-3 mr-1" />
              Éditer
            </Button>
            <Button variant="outline" size="sm" onClick={() => onCopy(template)}>
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => onDelete(template._id, template.nom)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
