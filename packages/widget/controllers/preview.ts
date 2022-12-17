import { Controller } from '../utils';
import { Component, Water, Middleware, Body } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined } from '@pjblog/core';
import type Comment from '..';

interface IResponse {
  html: string,
}

@Controller('POST', '/preview')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class Preview extends Component<Comment, IResponse> {
  public response(): IResponse {
    return {
      html: null
    }
  }

  @Water()
  public compileMarkdown(@Body() data: { content: string }) {
    return async (context: IResponse) => {
      if (!data.content) return;
      const { html } = await this.container.markdown.compile(data.content, {
        rehypes: this.container.markdown.getAllRehypes(),
        remarks: this.container.markdown.getAllRemarks(),
      })
      context.html = html;
    }
  }
}