import { Controller } from '../utils';
import { Component, Water, Middleware, Param, State } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined, numberic, BlogUserEntity } from '@pjblog/core';
import { HttpNotFoundException, HttpNotAcceptableException } from '@typeservice/exception';
import { CommentDBO } from '../dbo';
import { BlogCommentEntity } from '../entity';
import type Comment from '..';

type IResponse = number;

@Controller('DELETE', '/:cid(\\d+)')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class DelComment extends Component<Comment, IResponse> {
  get manager() {
    return this.container.connection.manager;
  }

  public response(): IResponse {
    return Date.now();
  }

  @Water({ stage: 1 })
  public checkComment(@Param('cid', numberic(0)) cid: number) {
    const service = new CommentDBO(this.manager);
    return async (context: IResponse) => {
      if (!cid) throw new HttpNotFoundException('找不到评论');
      const comment = await service.getOne(cid);
      if (!comment) throw new HttpNotFoundException('找不到评论');
      return comment;
    }
  }

  @Water({ stage: 2 })
  public checkDeletable(@State('profile') profile: BlogUserEntity) {
    return async (context: IResponse, comment: BlogCommentEntity) => {
      if (profile.level > 1 && profile.id !== comment.comm_user_id) {
        throw new HttpNotAcceptableException('您没有权限删除此评论');
      }
      return comment;
    }
  }

  @Water({ stage: 3 })
  public del() {
    const service = new CommentDBO(this.manager);
    return async (context: IResponse, comment: BlogCommentEntity) => {
      await service.delete(comment);
    }
  }
}