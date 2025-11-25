import { Router } from 'express';
import { createMember, listMembers, deleteMember } from '../controllers/memberController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.post('/', createMember);
router.get('/', listMembers);
router.delete('/:id', deleteMember);

export default router;
