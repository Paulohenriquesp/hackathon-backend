import { Response } from 'express';
import { ResponseHelper } from '../response';

// Mock Express Response
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('ResponseHelper', () => {
  let res: Response;

  beforeEach(() => {
    res = mockResponse();
  });

  describe('success', () => {
    it('should return success response with data', () => {
      const data = { id: 1, name: 'Test' };
      ResponseHelper.success(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: undefined
      });
    });

    it('should return success response with custom message and status', () => {
      const data = { id: 1 };
      const message = 'Operation successful';
      ResponseHelper.success(res, data, message, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message
      });
    });
  });

  describe('error', () => {
    it('should return error response', () => {
      const errorMessage = 'Something went wrong';
      ResponseHelper.error(res, errorMessage);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: errorMessage,
        details: undefined
      });
    });

    it('should return error response with custom status and details', () => {
      const errorMessage = 'Validation failed';
      const details = { field: 'email', message: 'Invalid email' };
      ResponseHelper.error(res, errorMessage, 422, details);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: errorMessage,
        details
      });
    });
  });

  describe('created', () => {
    it('should return 201 created response', () => {
      const data = { id: 1, name: 'New Item' };
      ResponseHelper.created(res, data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: 'Criado com sucesso'
      });
    });

    it('should return 201 with custom message', () => {
      const data = { id: 1 };
      const customMessage = 'Resource created successfully';
      ResponseHelper.created(res, data, customMessage);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data,
        message: customMessage
      });
    });
  });

  describe('notFound', () => {
    it('should return 404 not found response', () => {
      ResponseHelper.notFound(res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Recurso não encontrado',
        details: undefined
      });
    });

    it('should return 404 with custom message', () => {
      const message = 'User not found';
      ResponseHelper.notFound(res, message);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: undefined
      });
    });
  });

  describe('unauthorized', () => {
    it('should return 401 unauthorized response', () => {
      ResponseHelper.unauthorized(res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Não autorizado',
        details: undefined
      });
    });

    it('should return 401 with custom message', () => {
      const message = 'Invalid credentials';
      ResponseHelper.unauthorized(res, message);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: undefined
      });
    });
  });

  describe('forbidden', () => {
    it('should return 403 forbidden response', () => {
      ResponseHelper.forbidden(res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Acesso negado',
        details: undefined
      });
    });

    it('should return 403 with custom message', () => {
      const message = 'Insufficient permissions';
      ResponseHelper.forbidden(res, message);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: undefined
      });
    });
  });

  describe('serverError', () => {
    it('should return 500 server error response', () => {
      ResponseHelper.serverError(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Erro interno do servidor',
        details: undefined
      });
    });

    it('should return 500 with custom message', () => {
      const message = 'Database connection failed';
      ResponseHelper.serverError(res, message);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: message,
        details: undefined
      });
    });
  });
});
