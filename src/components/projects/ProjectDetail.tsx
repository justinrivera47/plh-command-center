import { useParams } from 'react-router-dom';

// Placeholder - will be implemented in Phase 3
export function ProjectDetail() {
  const { projectId } = useParams();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold text-text-primary mb-4">
        Project Details
      </h2>
      <p className="text-text-secondary">Project ID: {projectId}</p>
    </div>
  );
}
