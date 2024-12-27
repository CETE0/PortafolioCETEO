import ProjectView from '../../../components/layout/ProjectView';
import { getProjectContent } from '../../../lib/projects';

export default function ProjectPage({ params }) {
  const project = getProjectContent(params.category, params.project);
  
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Project not found
      </div>
    );
  }

  const content = project.images || project.content;

  return (
    <div className="h-full">
      <ProjectView 
        title={project.title}
        content={content}
      />
    </div>
  );
}