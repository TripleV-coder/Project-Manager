'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import { extractAssignableUsers } from '@/lib/projectRoster';

/**
 * Hook pour charger et gérer les données nécessaires aux formulaires de création/édition
 * d'items (Epic, Story, Tâche, Bug)
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.projectId - ID du projet sélectionné (optionnel)
 * @param {boolean} options.loadProjects - Charger la liste des projets
 * @param {boolean} options.loadUsers - Charger la liste des utilisateurs
 * @param {boolean} options.loadSprints - Charger la liste des sprints
 * @param {boolean} options.loadDeliverables - Charger la liste des livrables
 * @param {Function} options.onUnauthorized - Callback en cas d'erreur 401
 */
export function useItemFormData({
  projectId = null,
  loadProjects = true,
  loadUsers = true,
  loadSprints = true,
  loadDeliverables = false,
  onUnauthorized = () => {},
} = {}) {
  const { authFetch } = useAuthFetch();

  // États des données
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [epics, setEpics] = useState([]);
  const [stories, setStories] = useState([]);

  // États de chargement
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [loadingDeliverables, setLoadingDeliverables] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  // États d'erreur
  const [errors, setErrors] = useState({
    projects: null,
    users: null,
    sprints: null,
    deliverables: null,
    items: null,
  });

  // Vérification si les données sont prêtes
  const [dataReady, setDataReady] = useState(false);

  /**
   * Extrait les données d'une réponse API de manière sécurisée
   * Supporte les formats: { data: [...] }, { items: [...] }, [...] direct
   */
  const extractData = useCallback((response, keys = ['data']) => {
    if (!response) return [];

    // Si c'est directement un tableau
    if (Array.isArray(response)) return response;

    // Chercher dans les clés possibles
    for (const key of keys) {
      if (response[key] && Array.isArray(response[key])) {
        return response[key];
      }
    }

    return [];
  }, []);

  /**
   * Helper interne : fetch + parse JSON avec gestion d'erreurs
   */
  const safeFetchJson = useCallback(
    async (url) => {
      const response = await authFetch(url);
      if (!response.ok) {
        const error = new Error(`HTTP_ERROR_${response.status}`);
        error.status = response.status;
        try {
          error.data = await response.json();
        } catch {
          /* ignore */
        }
        throw error;
      }
      return await response.json();
    },
    [authFetch]
  );

  /**
   * Charger les projets
   */
  const fetchProjects = useCallback(async () => {
    if (!loadProjects) return;

    setLoadingProjects(true);
    setErrors((prev) => ({ ...prev, projects: null }));

    try {
      const response = await safeFetchJson('/api/projects?limit=100&page=1');
      const projectsList = extractData(response, ['data', 'projects']);

      if (!Array.isArray(projectsList)) {
        throw new Error('Format de réponse invalide pour les projets');
      }

      setProjects(projectsList);
      return projectsList;
    } catch (error) {
      console.error('Erreur chargement projets:', error);
      setErrors((prev) => ({ ...prev, projects: error.message }));

      if (error.message === 'UNAUTHORIZED') {
        onUnauthorized();
      } else if (!error.message?.startsWith('HTTP_ERROR')) {
        toast.error('Erreur lors du chargement des projets');
      }
      return [];
    } finally {
      setLoadingProjects(false);
    }
  }, [loadProjects, extractData, onUnauthorized, safeFetchJson]);

  /**
   * Charger les personnes assignables : roster du projet, pas l'annuaire admin.
   */
  const fetchUsers = useCallback(
    async (filterProjectId = projectId) => {
      if (!loadUsers) return;

      setLoadingUsers(true);
      setErrors((prev) => ({ ...prev, users: null }));

      try {
        if (!filterProjectId || filterProjectId === 'all') {
          setUsers([]);
          return [];
        }

        const response = await safeFetchJson(`/api/projects/${filterProjectId}`);
        const project = response.project || response.data || response;
        const usersList = extractAssignableUsers(project);

        setUsers(usersList);
        return usersList;
      } catch (error) {
        console.error('Erreur chargement membres du projet:', error);
        setErrors((prev) => ({ ...prev, users: error.message }));
        setUsers([]);

        if (error.message === 'UNAUTHORIZED') {
          onUnauthorized();
        }
        return [];
      } finally {
        setLoadingUsers(false);
      }
    },
    [loadUsers, projectId, onUnauthorized, safeFetchJson]
  );

  /**
   * Charger les sprints (optionnellement filtrés par projet)
   */
  const fetchSprints = useCallback(
    async (filterProjectId = null) => {
      if (!loadSprints) return;

      setLoadingSprints(true);
      setErrors((prev) => ({ ...prev, sprints: null }));

      try {
        const url = filterProjectId
          ? `/api/sprints?projet_id=${filterProjectId}`
          : '/api/sprints?limit=100';

        const response = await safeFetchJson(url);
        const sprintsList = extractData(response, ['data', 'sprints']);

        if (!Array.isArray(sprintsList)) {
          throw new Error('Format de réponse invalide pour les sprints');
        }

        setSprints(sprintsList);
        return sprintsList;
      } catch (error) {
        console.error('Erreur chargement sprints:', error);
        setErrors((prev) => ({ ...prev, sprints: error.message }));

        if (error.message === 'UNAUTHORIZED') {
          onUnauthorized();
        }
        return [];
      } finally {
        setLoadingSprints(false);
      }
    },
    [loadSprints, extractData, onUnauthorized, safeFetchJson]
  );

  /**
   * Charger les livrables (optionnellement filtrés par projet)
   */
  const fetchDeliverables = useCallback(
    async (filterProjectId = null) => {
      if (!loadDeliverables) return;

      setLoadingDeliverables(true);
      setErrors((prev) => ({ ...prev, deliverables: null }));

      try {
        const url = filterProjectId
          ? `/api/deliverables?projet_id=${filterProjectId}&limit=100`
          : '/api/deliverables?limit=100&page=1';

        const response = await safeFetchJson(url);
        const deliverablesList = extractData(response, ['data', 'deliverables']);

        if (!Array.isArray(deliverablesList)) {
          throw new Error('Format de réponse invalide pour les livrables');
        }

        setDeliverables(deliverablesList);
        return deliverablesList;
      } catch (error) {
        console.error('Erreur chargement livrables:', error);
        setErrors((prev) => ({ ...prev, deliverables: error.message }));

        if (error.message === 'UNAUTHORIZED') {
          onUnauthorized();
        }
        return [];
      } finally {
        setLoadingDeliverables(false);
      }
    },
    [loadDeliverables, extractData, onUnauthorized, safeFetchJson]
  );

  /**
   * Charger les epics et stories pour un projet donné
   */
  const fetchEpicsAndStories = useCallback(
    async (filterProjectId) => {
      if (!filterProjectId || filterProjectId === 'all') {
        setEpics([]);
        setStories([]);
        return { epics: [], stories: [] };
      }

      setLoadingItems(true);
      setErrors((prev) => ({ ...prev, items: null }));

      try {
        const response = await safeFetchJson(
          `/api/tasks?projet_id=${filterProjectId}&limit=200&page=1`
        );
        const tasksList = extractData(response, ['data', 'tasks']);

        if (!Array.isArray(tasksList)) {
          throw new Error('Format de réponse invalide pour les tâches');
        }

        const epicsList = tasksList.filter((t) => t.type === 'Épic');
        const storiesList = tasksList.filter((t) => t.type === 'Story');

        setEpics(epicsList);
        setStories(storiesList);

        return { epics: epicsList, stories: storiesList };
      } catch (error) {
        console.error('Erreur chargement epics/stories:', error);
        setErrors((prev) => ({ ...prev, items: error.message }));

        if (error.message === 'UNAUTHORIZED') {
          onUnauthorized();
        }
        return { epics: [], stories: [] };
      } finally {
        setLoadingItems(false);
      }
    },
    [extractData, onUnauthorized, safeFetchJson]
  );

  /**
   * Charger toutes les données initiales
   */
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setDataReady(false);

    try {
      const promises = [];

      if (loadProjects) promises.push(fetchProjects());
      if (loadUsers) promises.push(fetchUsers());
      if (loadSprints) promises.push(fetchSprints(projectId));
      if (loadDeliverables) promises.push(fetchDeliverables(projectId));

      await Promise.all(promises);

      // Charger les epics/stories si un projet est sélectionné
      if (projectId && projectId !== 'all') {
        await fetchEpicsAndStories(projectId);
      }

      setDataReady(true);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    loadProjects,
    loadUsers,
    loadSprints,
    loadDeliverables,
    fetchProjects,
    fetchUsers,
    fetchSprints,
    fetchDeliverables,
    fetchEpicsAndStories,
  ]);

  /**
   * Recharger les données liées à un projet spécifique
   */
  const reloadProjectData = useCallback(
    async (newProjectId) => {
      const promises = [];

      if (loadSprints) promises.push(fetchSprints(newProjectId));
      if (loadDeliverables) promises.push(fetchDeliverables(newProjectId));
      if (loadUsers) promises.push(fetchUsers(newProjectId));
      promises.push(fetchEpicsAndStories(newProjectId));

      await Promise.all(promises);
    },
    [
      loadSprints,
      loadDeliverables,
      loadUsers,
      fetchSprints,
      fetchDeliverables,
      fetchUsers,
      fetchEpicsAndStories,
    ]
  );

  /**
   * Rafraîchir toutes les données
   */
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // Charger les données au montage
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Recharger quand le projet change
  useEffect(() => {
    if (dataReady && projectId) {
      reloadProjectData(projectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return {
    // Données
    projects,
    users,
    sprints,
    deliverables,
    epics,
    stories,

    // États de chargement
    loading,
    loadingProjects,
    loadingUsers,
    loadingSprints,
    loadingDeliverables,
    loadingItems,

    // États d'erreur
    errors,
    hasErrors: Object.values(errors).some((e) => e !== null),

    // État de préparation
    dataReady,

    // Actions
    refresh,
    reloadProjectData,
    fetchEpicsAndStories,
  };
}

export default useItemFormData;
