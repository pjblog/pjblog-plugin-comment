import Comment from '..';
import { Controller } from '../utils';
import { Component, Water, Middleware, Request } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined, numberic, ArticleDBO, BlogUserEntity } from '@pjblog/core';
import { HttpNotFoundException, HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { BlogCommentEntity } from '../entity';
import { Markdown } from '@pjblog/markdown';
import { getNode } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import type { EntityManager } from 'typeorm';
import type { TCommentRawState, TCommentState } from '../types';

interface IBody {
  content: string,
}

@Controller('PUT', '/:aid(\\d+)')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class AddCommentController extends Component<TCommentState, IBody> {
  public readonly manager: EntityManager;
  public readonly comment: Comment;
  public readonly markdown: Markdown;
  public readonly article: ArticleDBO;
  public readonly service: CommentDBO;
  constructor(req: Request<IBody>) {
    super(req, createNewData());
    this.manager = getNode(TypeORM).value.manager;
    this.comment = getNode(Comment);
    this.markdown = getNode(Markdown);
    this.article = new ArticleDBO(this.manager);
    this.service = new CommentDBO(this.manager);
  }

  @Water(1)
  public checkCommentable() {
    if (!this.req.body.content) {
      throw new HttpBadRequestException('缺少评论内容');
    }
    const commentbale = this.comment.storage.get('commentable');
    if (!commentbale) {
      throw new HttpBadRequestException('评论功能已禁止');
    }
  }

  @Water(2)
  public async checkArticle() {
    const aid = numberic(0)(this.req.params.aid);
    if (!aid) throw new HttpNotFoundException('找不到文章');
    const article = await this.article.getOne(aid);
    if (!article ) throw new HttpNotFoundException('找不到文章');
    return article;
  }

  @Water(3)
  public async checkCommentParent() {
    const cid = numberic(0)(this.req.query.cid);
    if (cid) {
      const comment = await this.service.getOne(cid);
      if (!comment) throw new HttpNotFoundException('找不到评论');
    }
  }

  @Water(4)
  public async compileMarkdown() {
    const { html } = await this.markdown.compile(this.req.body.content, {
      rehypes: this.markdown.getAllRehypes(),
      remarks: this.markdown.getAllRemarks(),
    })
    return html;
  }

  @Water(5)
  public add() {
    const ip = this.req.ip;
    const cid = numberic(0)(this.req.query.cid);
    const data = this.req.body;
    const user: BlogUserEntity = this.req.state.profile;
    const comment = new BlogCommentEntity();
    const html = this.getCache<AddCommentController, 'compileMarkdown'>('compileMarkdown');
    const article = this.getCache<AddCommentController, 'checkArticle'>('checkArticle');
    comment.comm_content = data.content;
    comment.comm_html = html;
    comment.comm_ip = ip;
    comment.comm_parent_id = cid;
    comment.comm_user_id = user.id;
    comment.comm_article_id = article.id;
    comment.gmt_create = new Date();
    return this.manager.getRepository(BlogCommentEntity).save(comment);
  }

  @Water(6)
  public runner() {
    const comment = this.getCache<AddCommentController, 'add'>('add');
    const runner = this.service.createNewRunner();
    runner.where('comm.id=:cid', { cid: comment.id });
    return runner;
  }

  @Water(7)
  public async raws() {
    const runner = this.getCache<AddCommentController, 'runner'>('runner');
    const comment = this.getCache<AddCommentController, 'add'>('add');
    const data = await runner.getRawMany<TCommentRawState>();
    const res = this.service.formatRawComments(data || []);
    const chunk = res[0];
    if (chunk && comment.comm_parent_id === 0) {
      chunk.replies = [];
    }
    this.res.id = chunk.id;
    this.res.html = chunk.html;
    this.res.ip = chunk.ip;
    this.res.ctime = chunk.ctime;
    this.res.rid = chunk.rid;
    this.res.article = chunk.article;
    this.res.user = chunk.user;
  }
}

function createNewData(): TCommentState {
  return {
    id: 0,
    html: null,
    ip: null,
    ctime: new Date(),
    rid: 0,
    article: {
      id: 0,
      title: null,
      code: null,
    },
    user: {
      id: 0,
      nickname: null,
      account: null,
      avatar: null,
      level: 99
    }
  }
}