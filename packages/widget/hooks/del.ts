import { DelControlArticle, BlogArticleEntity } from '@pjblog/core';
import { getWaterFall } from '@pjblog/http';
import { Context } from 'koa';
import { CommentDBO } from '../dbo';
import type Comment from '..';

export function delCommentsWhenDelArticle(widget: Comment) {
  const water = getWaterFall(DelControlArticle);
  water.add('delComments', {
    before: 'deleteArticle',
    async callback(ctx: Context, context: number, article: BlogArticleEntity) {
      const service = new CommentDBO(widget.connection.manager);
      await service.deleteAllArticleComments(article.id);
      return article;
    }
  })
  return () => water.del('delComments');
}