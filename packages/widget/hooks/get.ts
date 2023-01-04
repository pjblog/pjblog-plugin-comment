import { ArticlesController } from '@pjblog/core';
import { getWaterFall } from '@pjblog/http';
import { BlogCommentEntity } from '../entity';

// interface IAritlcesRaw extends TArticleRaw {
//   comments: number,
// }

export function pushCommentTotal() {
  const water = getWaterFall(ArticlesController);

  water.add('addCommentsRunner', {
    before: 'getList',
    async callback(controller) {
      const runner = controller.getCache<ArticlesController, 'createRunner'>('createRunner');
      runner.leftJoin(BlogCommentEntity, 'comm', 'comm.comm_article_id=art.id');
      runner.addSelect('COUNT(comm.id)', 'comments');
      return runner;
    }
  })

  water.add('addComments', {
    after: 'formatArticles',
    async callback(controller) {
      const source = controller.getCache<ArticlesController, 'getList'>('getList');
      const dataSource = controller.getCache<ArticlesController, 'formatArticles'>('formatArticles');
      dataSource.forEach((data, index) => {
        // @ts-ignore
        data.comments = source[index].comments;
      })
    }
  })

  return () => {
    water.del('addCommentsRunner');
    water.del('addComments');
  }
}