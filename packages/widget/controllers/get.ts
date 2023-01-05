import Comment from '..';
import { Controller } from '../utils';
import { Component, Water, Request } from '@pjblog/http';
import { numberic, ArticleDBO } from '@pjblog/core';
import { HttpNotFoundException, HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { getNode } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import type { EntityManager } from 'typeorm';
import type { TCommentRawState, TCommentState } from '../types';

export interface IGetCommentsControllerResponse {
  dataSource: TCommentState[],
  total: number,
  size: number,
}

@Controller('GET', '/:aid(\\d+)')
export class GetCommentsController extends Component<IGetCommentsControllerResponse> {
  public readonly manager: EntityManager;
  public readonly service: CommentDBO;
  public readonly comment: Comment;
  public readonly article: ArticleDBO;
  constructor(req: Request) {
    super(req, {
      dataSource: [],
      total: 0,
      size: 0,
    });
    this.manager = getNode(TypeORM).value.manager;
    this.comment = getNode(Comment);
    this.service = new CommentDBO(this.manager);
    this.article = new ArticleDBO(this.manager);
  }

  @Water(1)
  public getSize() {
    this.res.size = this.comment.storage.get('pagesize');
  }

  @Water(2)
  public checkCommentable() {
    const commentbale = this.comment.storage.get('commentable');
    if (!commentbale) {
      throw new HttpBadRequestException('评论功能已禁止');
    }
  }

  @Water(3)
  public async checkArticle() {
    const aid = numberic(0)(this.req.params.aid);
    if (!aid) throw new HttpNotFoundException('找不到文章');
    const article = await this.article.getOne(aid);
    if (!article ) throw new HttpNotFoundException('找不到文章');
    return article;
  }

  @Water(4)
  public runner() {
    const aid = numberic(0)(this.req.params.aid);
    const runner = this.service.createNewRunner();
    runner.where('comm.comm_article_id=:aid', { aid });
    runner.andWhere('comm.comm_parent_id=0');
    return runner;
  }

  @Water(5)
  public async total() {
    const runner = this.getCache<GetCommentsController, 'runner'>('runner');
    const count = await runner.clone().getCount();
    this.res.total = count;
    return runner;
  }

  @Water(6)
  public async list() {
    const page = numberic(1)(this.req.query.page);
    const size = this.comment.storage.get('pagesize');
    const runner = this.getCache<GetCommentsController, 'runner'>('runner');
    const raws = await runner
      .orderBy({ 'comm.gmt_create': 'DESC' })
      .offset((page - 1) * size)
      .limit(size)
      .getRawMany<TCommentRawState>();
    return this.service.formatRawComments(raws);
  }

  @Water(7)
  public replyRunner() {
    const comments = this.getCache<GetCommentsController, 'list'>('list');
    const ids = comments.map(raw => raw.id);
    const runner = this.service.createNewRunner();
    runner.where('comm.comm_parent_id IN (:...ids)', { ids });
    runner.orderBy({ 'comm.gmt_create': 'ASC' });
    return runner;
  }

  @Water(8)
  public async replies() {
    const comments = this.getCache<GetCommentsController, 'list'>('list');
    const runner = this.getCache<GetCommentsController, 'replyRunner'>('replyRunner');
    const raws = comments.length ? await runner.getRawMany<TCommentRawState>() : [];
    const res = this.service.formatRawComments(raws);
    return res;
  }

  @Water(9)
  public match() {
    const replies = this.getCache<GetCommentsController, 'replies'>('replies');
    const reply_maps = new Map<number, TCommentState[]>();
    replies.forEach(reply => {
      if (!reply_maps.has(reply.rid)) {
        reply_maps.set(reply.rid, []);
      }
      const chunks = reply_maps.get(reply.rid);
      chunks.push(reply);
    })
    return reply_maps;
  }

  @Water(10)
  public format() {
    const comments = this.getCache<GetCommentsController, 'list'>('list');
    const map = this.getCache<GetCommentsController, 'match'>('match');
    this.res.dataSource.push(...comments.map(chunk => {
      chunk.replies = map.has(chunk.id) 
        ? map.get(chunk.id) 
        : []
      return chunk;
    }))
  }
}