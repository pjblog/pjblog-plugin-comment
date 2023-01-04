import { _DelArticleController } from '@pjblog/core';
import { getWaterFall } from '@pjblog/http';
import { CommentDBO } from '../dbo';
import type Comment from '..';

export function delCommentsWhenDelArticle(widget: Comment) {
  const water = getWaterFall(_DelArticleController);
  water.add('delComments', {
    before: 'deleteArticle',
    async callback(controller) {
      const article = controller.getCache<_DelArticleController, 'checkID'>('checkID');
      const service = new CommentDBO(widget.connection.manager);
      await service.deleteAllArticleComments(article.id);
      return article;
    }
  })
  return () => water.del('delComments');
}