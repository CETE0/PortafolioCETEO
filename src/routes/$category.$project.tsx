import { createFileRoute, notFound } from '@tanstack/react-router'
import ProjectView from '@/components/layout/ProjectView'
import { getProjectContent } from '@/lib/projects'
import { pageTitle, SITE } from '@/data/site'
import { useLanguage } from '@/i18n/LanguageContext'

export const Route = createFileRoute('/$category/$project')({
  loader: ({ params }) => {
    const project = getProjectContent(params.category, params.project)
    if (!project) throw notFound()
    return project
  },
  head: ({ loaderData }) => {
    const title = pageTitle(loaderData?.title)
    const description = `View ${loaderData?.title ?? 'this project'} by ${SITE.name}, new media artist.`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'article' },
      ],
    }
  },
  notFoundComponent: NotFound,
  component: ProjectPage,
})

function ProjectPage() {
  const project = Route.useLoaderData()
  return (
    <div className="h-full">
      {/* key resets gallery index when switching projects */}
      <ProjectView
        key={`${project.category}/${project.projectId}`}
        title={project.title}
        content={project.content}
        category={project.category}
        projectId={project.projectId}
      />
    </div>
  )
}

function NotFound() {
  const { t } = useLanguage()
  return <div className="flex h-full items-center justify-center text-sm text-black">{t('project.notFound')}</div>
}
