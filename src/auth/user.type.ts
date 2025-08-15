export default interface UserType {
  id: string
  username: string
  email: string
  password: string
  role: Role
  tier: string
  address: string
  createdById: string
  telp: string
  logo?: Buffer
}