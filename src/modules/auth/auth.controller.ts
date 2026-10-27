import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserSignUpDto } from './dto/user.singup.dto';
import { SUCCESS_MESSAGES } from '../../common/constants';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh.token.dto';
import { GetCurrentUser } from '../../common/decorator/get-current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { sendResponse } from '../../common/helpers/api-response.helper';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User Sign Up (generates and sends OTP for verification)',
  })
  @ApiCreatedResponse({
    description:
      'User registered successfully. Please verify your email with OTP.',
  })
  async userSignUp(@Body() data: UserSignUpDto) {
    const result = await this.authService.userSignUp(data);
    return sendResponse(
      HttpStatus.CREATED,
      SUCCESS_MESSAGES.AUTH.REGISTRATION_SUCCESS,
      result,
    );
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify account activation OTP' })
  @ApiOkResponse({ description: 'Email verified successfully' })
  async verifyOtp(@Body() data: VerifyOtpDto) {
    const result = await this.authService.verifyOtp(data);
    return sendResponse(
      HttpStatus.OK,
      SUCCESS_MESSAGES.AUTH.EMAIL_VERIFIED,
      result,
    );
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiOkResponse({ description: 'Password reset OTP sent to email' })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(data);
    return sendResponse(HttpStatus.OK, SUCCESS_MESSAGES.AUTH.OTP_SENT, result);
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify password reset OTP before submitting new password',
  })
  @ApiOkResponse({ description: 'OTP verified successfully' })
  async verifyResetOtp(@Body() data: VerifyOtpDto) {
    const result = await this.authService.verifyResetOtp(data);
    return sendResponse(HttpStatus.OK, 'OTP verified successfully', result);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiOkResponse({ description: 'Password reset successfully' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    const result = await this.authService.resetPassword(data);
    return sendResponse(
      HttpStatus.OK,
      SUCCESS_MESSAGES.AUTH.PASSWORD_RESET,
      result,
    );
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP (VERIFICATION or RESET_PASSWORD)' })
  @ApiOkResponse({ description: 'OTP sent successfully' })
  async resendOtp(@Body() data: ResendOtpDto) {
    const result = await this.authService.resendOtp(data);
    return sendResponse(HttpStatus.OK, SUCCESS_MESSAGES.AUTH.OTP_SENT, result);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User / Admin Login' })
  @ApiOkResponse({ description: 'Login successful' })
  async signIn(@Body() data: LoginDto) {
    const result = await this.authService.signIn(data);
    return sendResponse(
      HttpStatus.OK,
      SUCCESS_MESSAGES.AUTH.LOGIN_SUCCESS,
      result,
    );
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ description: 'Token refreshed successfully' })
  async refreshToken(@Body() body: RefreshTokenDto) {
    const targetId = body.getTargetUserId
      ? body.getTargetUserId()
      : body.userId || (body.id as string);
    const result = await this.authService.refreshToken(
      targetId,
      body.refreshToken,
    );
    return sendResponse(HttpStatus.OK, 'Token refreshed successfully', result);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiOkResponse({ description: 'User profile fetched successfully' })
  async getMe(@GetCurrentUser() user: any) {
    // Resolves whether strategy/caller attached user.id, user.userId, or user.sub
    const id = user?.id || user?.userId || user?.sub;
    const result = await this.authService.findUser(id);
    return sendResponse(
      HttpStatus.OK,
      'User profile fetched successfully',
      result,
    );
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@GetCurrentUser() user: any) {
    const id = user?.id || user?.userId || user?.sub;
    const result = await this.authService.logout(id);
    return sendResponse(
      HttpStatus.OK,
      SUCCESS_MESSAGES.AUTH.LOGOUT_SUCCESS,
      result,
    );
  }
}
