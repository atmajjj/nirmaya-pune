import { UserDto, UpdateUserDto } from "../user.dto";
import knex from "../../../../database/index.schema";
import { IUser } from "../user.interface";
import HttpException from "../../../exceptions/HttpException";
import bcrypt from "bcrypt";
import { generateToken } from "../../../utils/jwt";

class UserService {
  /**
   * Register a new user
   */
  public async register(data: UserDto): Promise<IUser> {
    try {
      const existingUser = await knex("users")
        .where({ email: data.email })
        .first();

      if (existingUser) {
        // Check if the existing user is deleted
        if (existingUser.is_deleted) {
          // Option 1: Allow reactivation of deleted accounts
          await knex("users")
            .where({ id: existingUser.id })
            .update({
              is_deleted: false,
              deleted_by: null,
              deleted_at: null,
              updated_at: new Date(),
              password: await bcrypt.hash(data.password, 10), // Update password
              name: data.name,
            });
          const [reactivatedUser] = await knex("users")
            .where({ id: existingUser.id })
            .select("*");
          return reactivatedUser;
        } else {
          // Active user with this email exists
          throw new HttpException(409, "Email already registered");
        }
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const userData = {
        ...data,
        password: hashedPassword,
        created_by: data.created_by || 1, // Default to system user if not provided
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [result] = await knex("users").insert(userData).returning("*");
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error registering user: ${error.message}`);
    }
  }

  /**
   * Login a user and generate JWT token
   */
  public async login(
    email: string,
    password: string
  ): Promise<IUser & { token: string }> {
    try {
      if (!email || !password) {
        throw new HttpException(400, "Email and password are required");
      }

      const user = await knex("users")
        .where({ email, is_deleted: false })
        .first();

      if (!user) {
        throw new HttpException(404, "Email not registered");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new HttpException(401, "Incorrect password");
      }

      const token = generateToken(
        {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        "24h"
      );

      return {
        ...user,
        token,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error during login: ${error.message}`);
    }
  }

  /**
   * Get all users
   */
  public async getAllUsers(): Promise<IUser[]> {
    try {
      const users = await knex("users")
        .where({ is_deleted: false })
        .select("*");
      return users;
    } catch (error) {
      throw new HttpException(500, `Error fetching users: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(id: number): Promise<IUser> {
    try {
      const user = await knex("users").where({ id, is_deleted: false }).first();

      if (!user) {
        throw new HttpException(404, "User not found");
      }

      return user;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error fetching user: ${error.message}`);
    }
  }

  /**
   * Update user data
   */
  public async updateUser(
    id: number,
    data: UpdateUserDto,
    updatedBy: number
  ): Promise<IUser> {
    try {
      const existingUser = await knex("users")
        .where({ id, is_deleted: false })
        .first();

      if (!existingUser) {
        throw new HttpException(404, "User not found");
      }

      // Check if email is being updated and if it already exists
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await knex("users")
          .where({ email: data.email, is_deleted: false })
          .whereNot({ id })
          .first();

        if (emailExists) {
          throw new HttpException(409, "Email already exists");
        }
      }

      const updateData: Partial<IUser> = {
        ...data,
        updated_by: updatedBy,
        updated_at: new Date(),
      };

      // Hash password if being updated
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      const [result] = await knex("users")
        .where({ id })
        .update(updateData)
        .returning("*");

      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error updating user: ${error.message}`);
    }
  }

  /**
   * Soft delete a user
   */
  public async deleteUser(id: number, deletedBy: number): Promise<void> {
    try {
      const existingUser = await knex("users")
        .where({ id, is_deleted: false })
        .first();

      if (!existingUser) {
        throw new HttpException(404, "User not found");
      }

      await knex("users").where({ id }).update({
        is_deleted: true,
        deleted_by: deletedBy,
        deleted_at: new Date(),
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(500, `Error deleting user: ${error.message}`);
    }
  }
}

export default UserService;
