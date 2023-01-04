import { Controller } from '../utils';
import { Component, Water, Middleware, Request } from '@pjblog/http';
import { AutoGetUserInfo, CheckUserLogined } from '@pjblog/core';
import { Markdown } from '@pjblog/markdown';
import { getNode } from '@pjblog/manager';

interface IBody {
  content: string,
}

export interface IPreviewControllerResponse {
  html: string,
}

@Controller('POST', '/preview')
@Middleware(AutoGetUserInfo)
@Middleware(CheckUserLogined)
export class PreviewController extends Component<IPreviewControllerResponse, IBody> {
  public readonly markdown: Markdown;
  constructor(req: Request<IBody>) {
    super(req, { html: null });
    this.markdown = getNode(Markdown);
  }

  @Water()
  public async compileMarkdown() {
    const data = this.req.body;
    if (!data.content) return;
    const { html } = await this.markdown.compile(data.content, {
      rehypes: this.markdown.getAllRehypes(),
      remarks: this.markdown.getAllRemarks(),
    })
    this.res.html = html;
  }
}