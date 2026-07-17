/**
 * The only Storyblok content versions used by this site. Draft content is
 * restricted to the preview service; production builds use published content.
 */
export type StoryblokContentVersion = 'draft' | 'published';

/**
 * The minimal Storyblok Delivery API response consumed by listStories.
 */
export interface StoryblokStoryResponse<TStory> {
  data: {
    stories: TStory[];
  };
}

/**
 * A narrow, mockable subset of the Storyblok SDK client.
 */
export interface StoryblokDeliveryClient {
  get<TStory>(
    path: 'cdn/stories',
    parameters: {
      page: number;
      per_page: number;
      starts_with?: string;
      version: StoryblokContentVersion;
    },
  ): Promise<StoryblokStoryResponse<TStory>>;
}

/**
 * Reads every Storyblok story under an optional folder prefix using the
 * Delivery API's fixed-size pagination.
 *
 * @param client - A configured Storyblok Delivery API client.
 * @param version - The published or draft content version to request.
 * @param options - Optional Storyblok folder prefix used to limit stories.
 * @returns All matching stories in the API's page order.
 * @throws Propagates Delivery API errors so builds fail before publishing
 * incomplete static output.
 */
export async function listStories<TStory>(
  client: StoryblokDeliveryClient,
  version: StoryblokContentVersion,
  options: { starts_with?: string } = {},
): Promise<TStory[]> {
  const perPage = 100;
  const stories: TStory[] = [];

  for (let page = 1; ; page += 1) {
    const response = await client.get<TStory>('cdn/stories', {
      page,
      per_page: perPage,
      starts_with: options.starts_with,
      version,
    });

    stories.push(...response.data.stories);

    if (response.data.stories.length < perPage) {
      return stories;
    }
  }
}
