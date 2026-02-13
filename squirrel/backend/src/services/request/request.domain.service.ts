import { Injectable } from "@nestjs/common";
import { CreateRequestDto } from "../../modules/requests/dto/create-request.dto";
import { UpdateRequestDto } from "../../modules/requests/dto/update-request.dto";
import { RequestsService } from "../../modules/requests/requests.service";

@Injectable()
export class RequestDomainService {
  constructor(private readonly requests: RequestsService) {}

  async listCollectionRequests(
    collectionId: string,
    userId: string,
    page = 1,
    pageSize = 20,
  ) {
    return this.requests.list(collectionId, userId, page, pageSize);
  }

  async createRequest(
    collectionId: string,
    userId: string,
    dto: CreateRequestDto,
  ) {
    return this.requests.create(collectionId, userId, dto);
  }

  async updateRequest(
    requestId: string,
    userId: string,
    dto: UpdateRequestDto,
  ) {
    return this.requests.update(requestId, userId, dto);
  }

  async runRequest(requestId: string, userId: string) {
    return this.requests.run(requestId, userId);
  }
}
