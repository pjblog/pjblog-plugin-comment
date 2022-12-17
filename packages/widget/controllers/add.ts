import { SelectQueryBuilder } from 'typeorm';
import { Controller } from '../utils';
import { Component, Water, Middleware, Param, Query, Body, IP, State } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined, numberic, ArticleDBO, BlogArticleEntity, BlogUserEntity } from '@pjblog/core';
import { HttpNotFoundException, HttpBadRequestException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { BlogCommentEntity } from '../entity';
import type Comment from '..';
import type { TCommentRawState, TCommentState } from '../types';

type IResponse = TCommentState;

@Controller('PUT', '/:aid(\\d+)')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class AddComment extends Component<Comment, IResponse> {
  get manager() {
    return this.container.connection.manager;
  }

  public response(): IResponse {
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
  public checkCommentParent(@Query('cid', numberic(0)) cid: number) {
    const service = new CommentDBO(this.manager);
    return async (context: IResponse, article: BlogArticleEntity) => {
      if (cid) {
        const comment = await service.getOne(cid);
        if (!comment) throw new HttpNotFoundException('找不到评论');
      }
      return article;
    }
  }

  @Water({ stage: 3 })
  public compileMarkdown(@Body() data: { content: string }) {
    return async (context: IResponse, article: BlogArticleEntity) => {
      if (!data.content) throw new HttpBadRequestException('缺少评论内容');
      const { html } = await this.container.markdown.compile(data.content, {
        rehypes: this.container.markdown.getAllRehypes(),
        remarks: this.container.markdown.getAllRemarks(),
      })
      return {
        article, html
      }
    }
  }

  @Water({ stage: 4 })
  public add(
    @IP() ip: string,
    @Query('cid', numberic(0)) cid: number,
    @Body() data: { content: string },
    @State('profile') user: BlogUserEntity,
  ) {
    return (context: IResponse, options: {
      article: BlogArticleEntity,
      html: string,
    }) => {
      const comment = new BlogCommentEntity();
      comment.comm_content = data.content;
      comment.comm_html = options.html;
      comment.comm_ip = ip;
      comment.comm_parent_id = cid;
      comment.comm_user_id = user.id;
      comment.comm_article_id = options.article.id;
      comment.gmt_create = new Date();
      return this.manager.getRepository(BlogCommentEntity).save(comment); 
    }
  }

  @Water({ stage: 5 })
  public runner() {
    const service = new CommentDBO(this.manager);
    return (context: IResponse, comment: BlogCommentEntity) => {
      const runner = service.createNewRunner();
      runner.where('comm.id=:cid', { cid: comment.id });
      return {
        runner, comment
      }
    }
  }

  @Water({ stage: 6 })
  public raws() {
    const service = new CommentDBO(this.manager);
    return async (context: IResponse, options: { runner: SelectQueryBuilder<BlogCommentEntity>, comment: BlogCommentEntity }) => {
      const data = await options.runner.getRawMany<TCommentRawState>();
      const res = service.formatRawComments(data || []);
      const chunk = res[0];
      if (chunk && options.comment.comm_parent_id === 0) {
        chunk.replies = [];
      }
      context.id = chunk.id;
      context.html = chunk.html;
      context.ip = chunk.ip;
      context.ctime = chunk.ctime;
      context.rid = chunk.rid;
      context.article = chunk.article;
      context.user = chunk.user;
    }
  }
}