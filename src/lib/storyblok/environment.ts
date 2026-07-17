/**
 * Deployment targets with different CMS visibility and runtime requirements.
 */
export type StoryblokDeploymentTarget = 'preview' | 'production';

/**
 * The environment values needed to configure Storyblok without exposing a
 * management token to the frontend or the static production runtime.
 */
export interface StoryblokEnvironment {
  STORYBLOK_DRAFT_TOKEN?: string;
  STORYBLOK_PUBLISHED_TOKEN?: string;
}

/**
 * Resolves the single Delivery API token permitted for the selected build
 * target.
 *
 * @param target - Production for published static output or preview for drafts.
 * @param environment - Explicit environment variables, injected for testing.
 * @returns The token and whether the Storyblok visual preview bridge is enabled.
 * @throws Error when the selected target has no usable Delivery API token.
 */
export function resolveStoryblokEnvironment(
  target: StoryblokDeploymentTarget,
  environment: StoryblokEnvironment,
): { accessToken: string; preview: boolean } {
  const preview = target === 'preview';
  const accessToken = preview
    ? environment.STORYBLOK_DRAFT_TOKEN
    : environment.STORYBLOK_PUBLISHED_TOKEN;

  if (!accessToken) {
    throw new Error(
      preview
        ? 'STORYBLOK_DRAFT_TOKEN is required for a preview build'
        : 'STORYBLOK_PUBLISHED_TOKEN is required for a production build',
    );
  }

  return { accessToken, preview };
}
