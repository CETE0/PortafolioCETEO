import ProjectView from '@/components/layout/ProjectView';
import { getProjectContent } from '@/lib/projects';

export default async function ProjectPage({ params }) {
  console.log('Received params:', params);
  
  try {
    console.log('Attempting to get project content with:', {
      category: params.category,
      project: params.project
    });
    
    const project = getProjectContent(params.category, params.project);
    console.log('Retrieved project data:', project);
    
    if (!project) {
      console.log('No project found for:', params);
      return (
        <div className="h-full flex items-center justify-center text-black">
          Project not found
        </div>
      );
    }

    return (
      <div className="h-full">
        <ProjectView 
          title={project.title}
          content={project.content}
        />
      </div>
    );
  } catch (error) {
    console.error('Error in ProjectPage:', error);
    return (
      <div className="h-full flex items-center justify-center text-black">
        Error loading project: {error.message}
      </div>
    );
  }
}