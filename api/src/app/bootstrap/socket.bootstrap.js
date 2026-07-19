'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('./logger.bootstrap');
const { verifyAccessToken } = require('../common/utils/token');
const User = require('../../database/models/user.model');

let ioInstance = null;

const isAllowedLocalDevOrigin = (origin) => {
	return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
};

async function socketAuth(socket, next) {
	try {
		const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
		if (!token) {
			return next(new Error('Authentication required'));
		}

		let decoded;
		try {
			decoded = verifyAccessToken(token);
		} catch (err) {
			logger.warn('[api:socket:auth] Invalid token signature', { err: err.message });
			return next(new Error('Invalid token'));
		}

		const user = await User.findById(decoded.id || decoded.sub).lean();
		if (!user || user.isActive === false) {
			return next(new Error('User account is suspended or not found'));
		}

		socket.data.user = user;
		next();
	} catch (err) {
		logger.error('[api:socket:auth] Authentication error', { err: err.message });
		next(new Error('Internal authentication error'));
	}
}

function init(httpServer) {
	if (ioInstance) {
		return ioInstance;
	}

	const origins = env.socket?.corsOrigins || [];

	const io = new Server(httpServer, {
		cors: {
			origin(origin, callback) {
				if (!origin) return callback(null, true);
				const isAllowed = origins.includes(origin) || (env.node === 'development' && isAllowedLocalDevOrigin(origin));
				if (isAllowed) {
					return callback(null, true);
				}
				return callback(new Error(`CORS: Origin "${origin}" is not allowed`));
			},
			methods: ['GET', 'POST'],
			credentials: true,
		},
		pingInterval: 25_000,
		pingTimeout: 60_000,
		connectionStateRecovery: {
			maxDisconnectionDuration: 2 * 60 * 1000,
			skipMiddlewares: true,
		},
		transports: ['websocket', 'polling'],
	});

	attachRedisAdapter(io).catch((err) => {
		logger.warn('[api:socket.io] Redis adapter not attached — running single-instance', { err: err.message });
	});

	io.use(socketAuth);

	io.on('connection', (socket) => {
		const userId = socket.data.user?._id?.toString() ?? 'unknown';
		logger.info('[api:socket.io] Client connected to API Socket.io', { userId, socketId: socket.id });

		if (userId !== 'unknown') {
			socket.join(userId);
		}

		socket.on('disconnect', (reason) => {
			logger.info('[api:socket.io] Client disconnected from API Socket.io', { userId, reason });
		});
	});

	ioInstance = io;
	logger.info('[api:socket.io] Server bootstrapped');
	return io;
}

async function attachRedisAdapter(io) {
	const { createAdapter } = require('@socket.io/redis-adapter');
	const { getPubClient, getSubClient } = require('./redis.bootstrap');

	const pub = getPubClient();
	const sub = getSubClient();

	if (!pub || !sub) {
		throw new Error('Redis clients not initialized');
	}

	await Promise.race([
		new Promise((resolve, reject) => {
			if (pub.status === 'ready') return resolve();
			pub.once('ready', resolve);
			pub.once('error', reject);
			pub.once('end', () => reject(new Error('Redis gave up reconnecting')));
		}),
		new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ready timeout')), 5000)),
	]);

	io.adapter(createAdapter(pub, sub));
	logger.info('[api:socket.io] Redis adapter attached successfully ✓');
}

const http = require('http');

function propagateSocketEmit(room, event, payload) {
	const body = JSON.stringify({ room, event, payload });
	const msgServiceUrl = process.env.MSG_SERVICE_URL || 'http://localhost:5002';
	
	try {
		const url = new URL(msgServiceUrl);
		const req = http.request({
			hostname: url.hostname,
			port: url.port || 80,
			path: '/api/internal/socket/emit',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body),
			}
		}, (res) => {
			res.resume();
		});
		
		req.on('error', (e) => {
			console.warn('[SocketBridge] Failed to propagate socket event:', e.message);
		});
		
		req.write(body);
		req.end();
	} catch (err) {
		console.warn('[SocketBridge] Invalid MSG_SERVICE_URL or error:', err.message);
	}
}

function getIO() {
	if (!ioInstance) {
		return {
			to(room) {
				return {
					emit(event, payload) {
						propagateSocketEmit(room, event, payload);
					}
				};
			},
			emit(event, payload) {
				propagateSocketEmit(null, event, payload);
			}
		};
	}

	return new Proxy(ioInstance, {
		get(target, prop) {
			if (prop === 'to') {
				return function (room) {
					const originalRoom = target.to(room);
					return {
						emit(event, payload) {
							originalRoom.emit(event, payload);
							propagateSocketEmit(room, event, payload);
						}
					};
				};
			}
			if (prop === 'emit') {
				return function (event, payload) {
					target.emit(event, payload);
					propagateSocketEmit(null, event, payload);
				};
			}
			return target[prop];
		}
	});
}

module.exports = {
	init,
	getIO
};
