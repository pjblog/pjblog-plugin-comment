import { Controller } from '../utils';
import { Component, Water, Middleware, Request } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined, numberic, BlogUserEntity } from '@pjblog/core';
import { HttpNotFoundException, HttpNotAcceptableException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { getNode } from '@pjblog/manager';
import { TypeORM } from '@pjblog/typeorm';
import type { EntityManager } from 'typeorm';

@Controller('DELETE', '/:cid(\\d+)')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class DelCommentController extends Component<number> {
  public readonly manager: EntityManager;
  public readonly service: CommentDBO;
  constructor(req: Request) {
    super(req, Date.now());
    this.manager = getNode(TypeORM).value.manager;
    this.service = new CommentDBO(this.manager);
  }

  @Water(1)
  public async checkComment() {
    const cid = numberic(0)(this.req.params.cid);
    if (!cid) throw new HttpNotFoundException('找不到评论');
    const comment = await this.service.getOne(cid);
    if (!comment) throw new HttpNotFoundException('找不到评论');
    return comment;
  }

  @Water(2)
  public checkDeletable() {
    const comment = this.getCache('checkComment');
    const profile: BlogUserEntity = this.req.state.profile;
    if (profile.level > 1 && profile.id !== comment.comm_user_id) {
      throw new HttpNotAcceptableException('您没有权限删除此评论');
    }
  }

  @Water(3)
  public del() {
    const comment = this.getCache('checkComment');
    return this.service.delete(comment);
  }
}