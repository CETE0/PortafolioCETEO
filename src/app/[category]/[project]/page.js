import ProjectView from '@/components/layout/ProjectView';
import { getProjectContent } from '@/lib/projects';

// Función para generar metadatos dinámicos
export async function generateMetadata({ params }) {
  try {
    const project = getProjectContent(params.category, params.project);
    
    if (!project) {
      return {
        title: 'Project Not Found - CETEO',
        description: 'The requested project could not be found.',
      };
    }

    return {
      title: `${project.title} - CETEO`,
      description: project.content?.description || `View ${project.title} by CETEO, new media artist.`,
      openGraph: {
        title: `${project.title} - CETEO`,
        description: project.content?.description || `View ${project.title} by CETEO, new media artist.`,
        type: 'article',
      },
    };
  } catch (error) {
    return {
      title: 'Project - CETEO',
      description: 'View this project by CETEO, new media artist.',
    };
  }
}

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