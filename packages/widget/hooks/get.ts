import { SelectQueryBuilder } from 'typeorm';
import { BlogArticleEntity, Articles, TArticleRaw } from '@pjblog/core';
import { getWaterFall } from '@pjblog/http';
import { Context } from 'koa';
import { BlogCommentEntity } from '../entity';

interface IAritlcesRaw extends TArticleRaw {
  comments: number,
}

export function pushCommentTotal() {
  const water = getWaterFall(Articles);

  water.add('addCommentsRunner', {
    before: 'getList',
    async callback(ctx: Context, context: number, runner: SelectQueryBuilder<BlogArticleEntity>) {
      runner.leftJoin(BlogCommentEntity, 'comm', 'comm.comm_article_id=art.id');
      runner.addSelect('COUNT(comm.id)', 'comments');
      return runner;
    }
  })

  water.add('addComments', {
    after: 'formatArticles',
    async callback(ctx: Context, context: number, options: { 
      dataSource: any[], 
      source: IAritlcesRaw[] 
    }) {
      const dataSource = options.dataSource.map((data, index) => {
        data.comments = options.source[index].comments;
        return data;
      })
      return {
        dataSource,
        source: options.source,
      }
    }
  })

  return () => {
    water.del('addCommentsRunner');
    water.del('addComments');
  }
}