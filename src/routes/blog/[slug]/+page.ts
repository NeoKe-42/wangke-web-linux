import { error } from '@sveltejs/kit';
import { articles, findArticle } from '$lib/blog/articles';

export function entries() {
	return articles.map(({ slug }) => ({ slug }));
}

export function load({ params }) {
	const article = findArticle(params.slug);
	if (!article) error(404, 'Article not found');
	return { article };
}
