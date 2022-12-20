import { SelectQueryBuilder } from 'typeorm';
import { Controller } from '../utils';
import { Component, Water, Param, Query } from '@pjblog/http';
import { numberic, ArticleDBO } from '@pjblog/core';
import { HttpNotFoundException, HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { BlogCommentEntity } from '../entity';
import type Comment from '..';
import type { TCommentRawState, TCommentState } from '../types';

interface IResponse {
  dataSource: TCommentState[],
  total: number,
  size: number,
}

@Controller('GET', '/:aid(\\d+)')
export class GetComments extends Component<Comment, IResponse> {
  get manager() {
    return this.container.connection.manager;
  }

  public response(): IResponse {
    return {
      dataSource: [],
      total: 0,
      size: this.container.storage.get('pagesize'),
    }
  }

  @Water()
  public checkCommentable() {
    return () => {
      const commentbale = this.container.storage.get('commentable');
      if (!commentbale) {
        throw new HttpBadRequestException('评论功能已禁止');
      }
    }
  }

  @Water({ stage: 1 })
  public checkArticle(@Param('aid', numberic(0)) aid: number) {
    const service = new ArticleDBO(this.manager);
    return async () => {
      if (!aid) throw new HttpNotFoundException('找不到文章');
      const article = await service.getOne(aid);
      if (!article ) throw new HttpNotFoundException('找不到文章');
      return article;
    }
  }

  @Water({ stage: 2 })
  public runner(@Param('aid', numberic(0)) aid: number) {
    const service = new CommentDBO(this.manager);
    return () => {
      const runner = service.createNewRunner();
      runner.where('comm.comm_article_id=:aid', { aid });
      runner.andWhere('comm.comm_parent_id=0');
      return runner;
    }
  }

  @Water({ stage: 3 })
  public total() {
    return async (context: IResponse, runner: SelectQueryBuilder<BlogCommentEntity>) => {
      const count = await runner.clone().getCount();
      context.total = count;
      return runner;
    }
  }

  @Water({ stage: 4 })
  public list(@Query('page', numberic(1)) page: number) {
    const size = this.container.storage.get('pagesize');
    const service = new CommentDBO(this.manager);
    return async (context: IResponse, runner: SelectQueryBuilder<BlogCommentEntity>) => {
      const raws = await runner
        .orderBy({ 'comm.gmt_create': 'DESC' })
        .offset((page - 1) * size)
        .limit(size)
        .getRawMany<TCommentRawState>();
      return service.formatRawComments(raws);
    }
  }

  @Water({ stage: 5 })
  public replyRunner() {
    const service = new CommentDBO(this.manager);
    return (context: IResponse, comments: TCommentState[]) => {
      const ids = comments.map(raw => raw.id);
      const runner = service.createNewRunner();
      runner
        .where('comm.comm_parent_id IN (:...ids)', { ids })
        .orderBy({
          'comm.gmt_create': 'ASC'
        })
      return {
        comments, runner,
      }
    }
  }

  @Water({ stage: 6 })
  public replies() {
    const service = new CommentDBO(this.manager);
    return async (context: IResponse, options: { comments: TCommentState[], runner: SelectQueryBuilder<BlogCommentEntity> }) => {
      const raws = await options.runner.getRawMany<TCommentRawState>();
      const res = service.formatRawComments(raws);
      return {
        comments: options.comments,
        replies: res,
      }
    }
  }

  @Water({ stage: 7 })
  public match() {
    return (context: IResponse, options: { comments: TCommentState[], replies: TCommentState[] }) => {
      const reply_maps = new Map<number, TCommentState[]>();
      options.replies.forEach(reply => {
        if (!reply_maps.has(reply.rid)) {
          reply_maps.set(reply.rid, []);
        }
        const chunks = reply_maps.get(reply.rid);
        chunks.push(reply);
      })
      return {
        comments: options.comments,
        map: reply_maps
      }
    }
  }

  @Water({ stage: 8 })
  public format() {
    return (context: IResponse, options: { comments: TCommentState[], map: Map<number, TCommentState[]> }) => {
      context.dataSource.push(...options.comments.map(chunk => {
        chunk.replies = options.map.has(chunk.id) 
          ? options.map.get(chunk.id) 
          : []
        return chunk;
      }))
    }
  }
}